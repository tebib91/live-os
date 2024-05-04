import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export default class Container {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text', nullable: false })
  names!: string;

  @Column({ type: 'text', nullable: false })
  image!: string;

  @Column({ type: 'text', nullable: true })
  status?: string;
}
