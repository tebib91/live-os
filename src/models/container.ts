import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export default class Container {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "text", nullable: false })
  name!: string;

  @Column({ type: "text", nullable: false })
  imageName!: string;

  @Column({ type: "text", nullable: true })
  status?: string;
}
